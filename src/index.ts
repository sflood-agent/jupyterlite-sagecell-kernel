// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import type { IKernel } from '@jupyterlite/services';
import { IKernelSpecs } from '@jupyterlite/services';
import { SageCellKernel } from './kernel';

const kernel: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/sagecell-kernel:kernel',
  autoStart: true,
  requires: [IKernelSpecs],
  activate: (app: JupyterFrontEnd, kernelspecs: IKernelSpecs) => {
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
      create: async (options: IKernel.IOptions): Promise<IKernel> => {
        return new SageCellKernel(options);
      }
    });
  }
};

const plugins: JupyterFrontEndPlugin<void>[] = [kernel];
export default plugins;
