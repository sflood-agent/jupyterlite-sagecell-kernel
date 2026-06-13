"use strict";
(self["webpackChunk_jupyterlite_sagecell_kernel"] = self["webpackChunk_jupyterlite_sagecell_kernel"] || []).push([["lib_index_js"],{

/***/ "./lib/index.js":
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _jupyterlite_services__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlite/services */ "webpack/sharing/consume/default/@jupyterlite/services");
/* harmony import */ var _jupyterlite_services__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlite_services__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _kernel__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./kernel */ "./lib/kernel.js");
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.


const kernel = {
    id: '@jupyterlite/sagecell-kernel:kernel',
    autoStart: true,
    requires: [_jupyterlite_services__WEBPACK_IMPORTED_MODULE_0__.IKernelSpecs],
    activate: (app, kernelspecs) => {
        kernelspecs.register({
            spec: {
                name: 'sagecell',
                display_name: 'SageCell (remote)',
                language: 'sage',
                argv: [],
                resources: {
                    'logo-32x32': '',
                    'logo-64x64': ''
                }
            },
            create: async (options) => {
                return new _kernel__WEBPACK_IMPORTED_MODULE_1__.SageCellKernel(options);
            }
        });
    }
};
const plugins = [kernel];
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugins);


/***/ }),

/***/ "./lib/kernel.js":
/*!***********************!*\
  !*** ./lib/kernel.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SageCellKernel: () => (/* binding */ SageCellKernel)
/* harmony export */ });
/* harmony import */ var _jupyterlite_services__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlite/services */ "webpack/sharing/consume/default/@jupyterlite/services");
/* harmony import */ var _jupyterlite_services__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlite_services__WEBPACK_IMPORTED_MODULE_0__);
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

const SAGECELL_SERVER = 'https://sagecell.sagemath.org';
// Each output lives in its own iframe, so SageCell's linked-cell registry cannot
// share a live session between executions. Replaying prior submissions rebuilds
// the notebook state while redirected streams keep earlier text output hidden.
function makeStatefulCode(history, code) {
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
function escapeHtmlAttr(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function makeIframeHtml(code, linkKey) {
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
    const srcdoc = escapeHtmlAttr(inner);
    return `<iframe style="display:block; width:100%; height:1px; border:0;" referrerpolicy="no-referrer" srcdoc="${srcdoc}"></iframe>`;
}
class SageCellKernel extends _jupyterlite_services__WEBPACK_IMPORTED_MODULE_0__.BaseKernel {
    constructor() {
        super(...arguments);
        this.executionHistory = [];
        this.linkKey = crypto.randomUUID();
    }
    async kernelInfoRequest() {
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
    async executeRequest(content) {
        const { code } = content;
        const statefulCode = makeStatefulCode(this.executionHistory, code);
        const html = makeIframeHtml(statefulCode, this.linkKey);
        this.executionHistory.push(code);
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
    async completeRequest(content) {
        throw new Error('Not implemented');
    }
    async inspectRequest(content) {
        throw new Error('Not implemented');
    }
    async isCompleteRequest(content) {
        return {
            status: 'complete'
        };
    }
    async commInfoRequest(content) {
        return {
            status: 'ok',
            comms: {}
        };
    }
    inputReply(content) {
        throw new Error('Not implemented');
    }
    async commOpen(msg) {
        throw new Error('Not implemented');
    }
    async commMsg(msg) {
        throw new Error('Not implemented');
    }
    async commClose(msg) {
        throw new Error('Not implemented');
    }
}


/***/ })

}]);
//# sourceMappingURL=lib_index_js.79c9abddf44db02f6006.js.map