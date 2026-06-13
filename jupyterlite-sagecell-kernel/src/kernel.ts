// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import type { KernelMessage } from '@jupyterlab/services';
import { BaseKernel } from '@jupyterlite/services';

// SageCell hosts the remote Sage process and the JavaScript embedding client.
const SAGECELL_SERVER = 'https://sagecell.sagemath.org';

/**
 * Combine a new cell with the code needed to reconstruct earlier notebook state.
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

/** Escape markup before placing a complete HTML document in an iframe srcdoc. */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build the iframe published as this execution's rich HTML result.
 *
 * SageCell's embed script finds the text/x-sage script, submits it remotely, and
 * renders the response inside the iframe. The iframe resizes itself as output
 * arrives so the notebook does not need its own SageCell-specific renderer.
 */
function makeIframeHtml(code: string, linkKey: string): string {
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
    // Everything produced by SageCell is inserted under this host element.
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

    // SageCell output can arrive asynchronously, so keep the outer iframe fitted.
    new ResizeObserver(fitFrameToContent).observe(host);
    fitFrameToContent();

    // The embedding API reads the source code from a text/x-sage script element.
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

  const srcdoc = escapeHtmlAttr(inner);

  return `<iframe style="display:block; width:100%; height:1px; border:0;" referrerpolicy="no-referrer" srcdoc="${srcdoc}"></iframe>`;
}

/**
 * A minimal JupyterLite kernel that delegates execution to remote SageMathCell.
 *
 * BaseKernel handles Jupyter messaging and execution counts. This class supplies
 * kernel metadata, turns each execution into an iframe result, and implements the
 * small set of protocol requests needed by a notebook.
 */
export class SageCellKernel extends BaseKernel {
  /** Successfully submitted source cells, replayed to approximate kernel state. */
  private readonly executionHistory: string[] = [];
  /** Identifier shared by this kernel's embedded SageCell instances. */
  private readonly linkKey = crypto.randomUUID();

  /** Describe this kernel and its Sage language to Jupyter frontends. */
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

  /** Submit a cell to SageCell and publish its iframe as an execute result. */
  async executeRequest(
    content: KernelMessage.IExecuteRequestMsg['content']
  ): Promise<KernelMessage.IExecuteReplyMsg['content']> {
    const { code } = content;
    const statefulCode = makeStatefulCode(this.executionHistory, code);
    const html = makeIframeHtml(statefulCode, this.linkKey);

    // Record the original cell only after preparing this execution's replay code.
    this.executionHistory.push(code);

    // Publishing sends an IOPub execute_result message for the notebook to render.
    this.publishExecuteResult({
      execution_count: this.executionCount,
      data: {
        'text/html': html,
        'text/plain': '[SageMathCell output]'
      },
      metadata: {}
    });

    return {
      status: 'ok',
      execution_count: this.executionCount,
      user_expressions: {}
    };
  }

  /** Completion is not available because requests are not proxied to SageCell. */
  async completeRequest(
    content: KernelMessage.ICompleteRequestMsg['content']
  ): Promise<KernelMessage.ICompleteReplyMsg['content']> {
    throw new Error('Not implemented');
  }

  /** Inspection is not available because requests are not proxied to SageCell. */
  async inspectRequest(
    content: KernelMessage.IInspectRequestMsg['content']
  ): Promise<KernelMessage.IInspectReply> {
    throw new Error('Not implemented');
  }

  /** Treat every submitted cell as complete; no multiline parser runs locally. */
  async isCompleteRequest(
    content: KernelMessage.IIsCompleteRequestMsg['content']
  ): Promise<KernelMessage.IIsCompleteReplyMsg['content']> {
    return {
      status: 'complete'
    };
  }

  /** Report that this kernel has no Jupyter comm targets or open comms. */
  async commInfoRequest(
    content: KernelMessage.ICommInfoRequestMsg['content']
  ): Promise<KernelMessage.ICommInfoReply> {
    return {
      status: 'ok',
      comms: {}
    };
  }

  /** stdin replies are unsupported because SageCell owns the remote session. */
  inputReply(content: KernelMessage.IInputReplyMsg['content']): void {
    throw new Error('Not implemented');
  }

  /** Jupyter widget comm channels are not implemented by this wrapper. */
  async commOpen(msg: KernelMessage.ICommOpenMsg): Promise<void> {
    throw new Error('Not implemented');
  }

  /** Jupyter widget comm channels are not implemented by this wrapper. */
  async commMsg(msg: KernelMessage.ICommMsgMsg): Promise<void> {
    throw new Error('Not implemented');
  }

  /** Jupyter widget comm channels are not implemented by this wrapper. */
  async commClose(msg: KernelMessage.ICommCloseMsg): Promise<void> {
    throw new Error('Not implemented');
  }
}
