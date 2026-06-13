// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import type { KernelMessage } from '@jupyterlab/services';
import { BaseKernel } from '@jupyterlite/services';

/** Base URL used by the HTML output to load SageMathCell's embed client. */
const SAGECELL_SERVER = 'https://sagecell.sagemath.org';

/**
 * Build the Sage source sent for one execution.
 *
 * A normal Jupyter kernel is a long-running process, so variables created by an
 * earlier cell remain available to later cells. This browser-side wrapper does
 * not run Sage itself: every output iframe starts a separate remote SageCell.
 * To imitate a persistent kernel, this function silently replays the source of
 * successful and failed earlier submissions before running the current cell.
 *
 * Each output lives in its own iframe, so SageCell's linked-cell registry cannot
 * share a live session between executions. Replaying prior submissions rebuilds
 * the notebook state while redirected streams keep earlier text output hidden.
 */
function makeStatefulCode(history: readonly string[], code: string): string {
  if (history.length === 0) {
    return code;
  }

  const replay = JSON.stringify(history);

  return `import contextlib as _jupyterlite_contextlib
import io as _jupyterlite_io

for _jupyterlite_code in ${replay}:
    try:
        with _jupyterlite_contextlib.redirect_stdout(_jupyterlite_io.StringIO()), _jupyterlite_contextlib.redirect_stderr(_jupyterlite_io.StringIO()):
            exec(preparse(_jupyterlite_code), globals())
    except Exception:
        pass

del _jupyterlite_code
del _jupyterlite_contextlib
del _jupyterlite_io

${code}`;
}

/**
 * Escape a complete HTML document so it can safely be placed in an iframe's
 * double-quoted `srcdoc` attribute.
 */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Create the HTML output published for an executed notebook cell.
 *
 * Jupyter display messages can contain several MIME representations. This
 * kernel publishes this iframe as `text/html`; the iframe then loads the
 * SageMathCell embed client, submits `code`, and displays the remote result.
 * Keeping SageCell in an iframe also isolates its scripts and styles from the
 * surrounding JupyterLite application.
 */
function makeIframeHtml(code: string, linkKey: string): string {
  // This document runs inside the output iframe, not in JupyterLite's page.
  const inner = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="${SAGECELL_SERVER}/static/embedded_sagecell.js"></script>
  <link rel="stylesheet" href="${SAGECELL_SERVER}/static/sagecell_embed.css" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: white;
      font-family: sans-serif;
    }
    #host {
      padding: 6px;
    }
  </style>
</head>
<body>
  <div id="host"></div>
  <script>
    const host = document.getElementById('host');
    const code = ${JSON.stringify(code)};
    const frame = window.frameElement;
    let resizeFrame = 0;

    const fitFrameToContent = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (frame) {
          frame.style.height = Math.ceil(host.getBoundingClientRect().bottom) + 'px';
        }
      });
    };

    new ResizeObserver(fitFrameToContent).observe(host);
    fitFrameToContent();

    const scriptTag = document.createElement('script');
    scriptTag.type = 'text/x-sage';
    scriptTag.text = code;
    host.appendChild(scriptTag);

    sagecell.makeSagecell({
      inputLocation: '#host',
      languages: ['sage'],
      autoeval: true,
      linked: true,
      linkKey: ${JSON.stringify(linkKey)},
      replaceOutput: true,
      hide: ['editor', 'evalButton', 'language', 'permalink', 'messages', 'sessionTitle']
    });
  </script>
</body>
</html>`;

  // The iframe begins at one pixel high. Its embedded ResizeObserver expands it
  // after SageCell renders a result, avoiding a large blank output area.
  const srcdoc = escapeHtmlAttr(inner);

  return `<iframe style="display:block; width:100%; height:1px; border:0;" referrerpolicy="no-referrer" srcdoc="${srcdoc}"></iframe>`;
}

/**
 * A JupyterLite kernel that delegates Sage execution to SageMathCell.
 *
 * `BaseKernel` receives Jupyter protocol messages from the notebook UI and
 * calls the corresponding request methods below. Unlike a traditional Jupyter
 * kernel, this class lives entirely in the browser and does not directly run a
 * Sage interpreter.
 */
export class SageCellKernel extends BaseKernel {
  // Source is retained so later executions can recreate the notebook's state.
  private readonly executionHistory: string[] = [];

  // SageCell uses this key to identify cells belonging to this kernel instance.
  private readonly linkKey = crypto.randomUUID();

  /**
   * Describe this kernel and its language to the Jupyter frontend.
   *
   * The frontend uses this reply for items such as syntax highlighting, file
   * extensions, the kernel banner, and help links.
   */
  async kernelInfoRequest(): Promise<KernelMessage.IInfoReply> {
    return {
      implementation: 'SageCell Remote Wrapper',
      implementation_version: '0.1.0',
      language_info: {
        codemirror_mode: { name: 'python' },
        file_extension: '.sage',
        mimetype: 'text/x-python',
        name: 'sage',
        nbconvert_exporter: 'python',
        pygments_lexer: 'python',
        version: 'unknown'
      },
      protocol_version: '5.3',
      status: 'ok',
      banner: 'A browser kernel that wraps SageMathCell in iframe output',
      help_links: [
        {
          text: 'JupyterLite custom kernels',
          url: 'https://jupyterlite.readthedocs.io/en/latest/howto/extensions/kernel.html'
        },
        {
          text: 'SageMathCell embedding',
          url: 'https://github.com/sagemath/sagecell/blob/master/doc/embedding.rst'
        }
      ]
    };
  }

  /**
   * Handle a notebook's request to execute a code cell.
   *
   * The method does not wait for SageMathCell to finish. Instead, it publishes
   * an HTML display result containing an auto-evaluating iframe and immediately
   * acknowledges the Jupyter execute request.
   */
  async executeRequest(
    content: KernelMessage.IExecuteRequestMsg['content']
  ): Promise<KernelMessage.IExecuteReplyMsg['content']> {
    const { code } = content;
    const statefulCode = makeStatefulCode(this.executionHistory, code);
    const html = makeIframeHtml(statefulCode, this.linkKey);

    // Record the original source only after preparing this execution; otherwise
    // the current cell would be included in its own replay.
    this.executionHistory.push(code);

    // Display data travels on Jupyter's IOPub channel. Browsers render the HTML
    // representation, while text-only clients can use the plain-text fallback.
    this.publishExecuteResult({
      execution_count: this.executionCount,
      data: {
        'text/html': html,
        'text/plain': '[SageMathCell output]'
      },
      metadata: {}
    });

    // This reply travels on the shell channel and tells the frontend that the
    // request itself was accepted. The iframe owns the remote execution result.
    return {
      status: 'ok',
      execution_count: this.executionCount,
      user_expressions: {}
    };
  }

  /** Code completion is not currently forwarded to SageMathCell. */
  async completeRequest(
    content: KernelMessage.ICompleteRequestMsg['content']
  ): Promise<KernelMessage.ICompleteReplyMsg['content']> {
    throw new Error('Not implemented');
  }

  /** Object inspection/help lookup is not currently supported. */
  async inspectRequest(
    content: KernelMessage.IInspectRequestMsg['content']
  ): Promise<KernelMessage.IInspectReply> {
    throw new Error('Not implemented');
  }

  /**
   * Tell the frontend that submitted source is ready to execute.
   *
   * This simple implementation does not parse Sage to detect incomplete blocks.
   */
  async isCompleteRequest(
    content: KernelMessage.IIsCompleteRequestMsg['content']
  ): Promise<KernelMessage.IIsCompleteReplyMsg['content']> {
    return {
      status: 'complete'
    };
  }

  /**
   * Report that this kernel has no open Jupyter widget communication channels.
   */
  async commInfoRequest(
    content: KernelMessage.ICommInfoRequestMsg['content']
  ): Promise<KernelMessage.ICommInfoReply> {
    return {
      status: 'ok',
      comms: {}
    };
  }

  /** Interactive stdin replies are not supported by the iframe wrapper. */
  inputReply(content: KernelMessage.IInputReplyMsg['content']): void {
    throw new Error('Not implemented');
  }

  /** Jupyter widget/comm messages are not supported by this kernel. */
  async commOpen(msg: KernelMessage.ICommOpenMsg): Promise<void> {
    throw new Error('Not implemented');
  }

  /** Jupyter widget/comm messages are not supported by this kernel. */
  async commMsg(msg: KernelMessage.ICommMsgMsg): Promise<void> {
    throw new Error('Not implemented');
  }

  /** Jupyter widget/comm messages are not supported by this kernel. */
  async commClose(msg: KernelMessage.ICommCloseMsg): Promise<void> {
    throw new Error('Not implemented');
  }
}
