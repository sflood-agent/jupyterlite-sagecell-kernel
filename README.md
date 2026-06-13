# Custom SageCell Kernel

This repository contains a custom remote SageCell kernel for JupyterLite. The
kernel sends each executed cell to [SageMathCell](https://sagecell.sagemath.org/)
and displays the result in an iframe.

The kernel package is stored in the `jupyterlite-sagecell-kernel` subdirectory,
and the generated JupyterLite site is tracked in `_output` for convenient
deployment.

> **Note:** Building the kernel and JupyterLite site can require a significant
> amount of memory. Do not run this process on a computer with limited RAM.

## Requirements

- JupyterLite >= 0.6.0
- Network access to `https://sagecell.sagemath.org`
- Conda or Mamba
- Git

## Set up the development environment

Clone this repository and enter its root directory:

```bash
git clone git@github.com:sflood-agent/jupyterlite-sagecell-kernel.git
cd jupyterlite-sagecell-kernel
```

Create and activate a dedicated environment, then install JupyterLite and
Node.js:

```bash
conda create -n jupyterlitesage python=3.12
conda activate jupyterlitesage
mamba install -c jupyterlab jupyterlite-core nodejs
```

Confirm that `python` and `pip` resolve to the newly activated environment
before continuing:

```bash
which python
which pip
```

## Install the kernel and build the site

From the repository root, install the kernel package from its subdirectory and
build the JupyterLite site:

```bash
pip install -e jupyterlite-sagecell-kernel
jupyter lite build
```

The generated site is written to `_output`.

## Preview and deploy

Preview the generated site locally:

```bash
jupyter lite serve
```

To deploy the site, copy the contents of `_output` to the relevant directory on
the server.

## Rebuild after editing the kernel

After editing the Jupyter kernel, run all three commands from the repository
root to reinstall the package, rebuild the site, and preview the result:

```bash
pip install -e jupyterlite-sagecell-kernel
jupyter lite build
jupyter lite serve
```

## Development uninstall

```bash
pip uninstall jupyterlite-sagecell-kernel
```
