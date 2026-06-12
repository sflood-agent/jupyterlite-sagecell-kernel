// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import type { KernelMessage } from '@jupyterlab/services';
import { BaseKernel } from '@jupyterlite/services';

const SAGECELL_SERVER = 'https://sagecell.sagemath.org';
const DEFAULT_HEIGHT = 520;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeIframeHtml(
  code: string,
  linkKey: string,
  height = DEFAULT_HEIGHT
): string {
  const inner = `@doctype html
<html>
<head>
  <meta charset="utf-8" />
  <script src="${SAGECELL_SERVER}/static/embedded_sagecell.js"></script>
  <link rel="stylesheet" href="${SAGECELL_SERVER}/static/sagecell_embed.css" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
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

  return `<iframe style="width:100%; min-height:${height}px; border:0;" referrerpolicy="no-referrer" srcdoc="${srcdoc}"></iframe>`;
}

export class SageCellKernel extends BaseKernel {
  private readonly linkKey = crypto.randomUUID();

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

  async executeRequest(
    content: KernelMessage.IExecuteRequestMsg['content']
  ): Promise<KernelMessage.IExecuteReplyMsg['content']> {
    const { code } = content;
    const html = makeIframeHtml(code, this.linkKey);

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

  async completeRequest(
    content: KernelMessage.ICompleteRequestMsg['content']
  ): Promise<KernelMessage.ICompleteReply> {
    throw new Error('Not implemented');
  }

  async inspectRequest(
    content: KernelMessage.IInspectRequestMsg['content']
  ): Promise<KernelMessage.IInspectReply> {
    throw new Error('Not implemented');
  }

  async isCompleteRequest(
    content: KernelMessage.IIsCompleteRequestMsg['content']
  ): Promise<KernelMessage.IIsCompleteReply> {
    return {
      status: 'complete'
    };
  }

  async commInfoRequest(
    content: KernelMessage.ICommInfoRequestMsg['content']
  ): Promise<KernelMessage.ICommInfoReply> {
    return {
      status: 'ok',
      comms: {}
    };
  }

  inputReply(content: KernelMessage.IInputReplyMsg['content']): void {
    throw new Error('Not implemented');
  }

  async commOpen(msg: KernelMessage.ICommOpenMsg): Promise<void> {
    throw new Error('Not implemented');
  }

  async commMsg(msg: KernelMessage.ICommMsgMsg): Promise<void> {
    throw new Error('Not implemented');
  }

  async commClose(msg: KernelMessage.ICommCloseMsg): Promise<void> {
    throw new Error('Not implemented');
  }
}
