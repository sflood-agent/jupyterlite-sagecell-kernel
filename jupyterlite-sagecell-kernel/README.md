# Custom SageCell Kernel

A remote SageCell wrapper kernel for JupyterLite. The kernel sends each executed
cell to [SageMathCell](https://sagecell.sagemath.org/) and displays the result in
an iframe.

> **Memory note:** Building JupyterLite and this extension can require a
> significant amount of memory. Do not run the build on a computer with limited
> RAM.

## Requirements

- JupyterLite >= 0.6.0
- Network access to `https://sagecell.sagemath.org`
- Node.js, for building the TypeScript extension
- A Python environment; the development workflow below uses Python 3.12

## Clone and prepare a development environment

Clone this repository, enter it, and create a dedicated conda environment:

```bash
git clone git@github.com:sflood-agent/jupyterlite-sagecell-kernel.git
cd jupyterlite-sagecell-kernel

conda create -n jupyterlitesage python=3.12
conda activate jupyterlitesage
mamba install -c jupyterlab jupyterlite-core nodejs
```

Confirm that `python` and `pip` resolve to the new environment before installing
anything:

```bash
which python
which pip
```

## Build and preview the JupyterLite site

The extension package is stored in the `jupyterlite-sagecell-kernel`
subdirectory. From the repository root, install it in editable mode and build
the site:

```bash
pip install -e jupyterlite-sagecell-kernel
jupyter lite build
```

The generated site is written to `_output`. To preview it locally, run:

```bash
jupyter lite serve
```

Select **SageCell (remote)** when creating a notebook or choosing a kernel.
Because the kernel delegates execution to SageMathCell, the previewed or
deployed site must be able to access `https://sagecell.sagemath.org`.

To deploy the static site, **copy** the contents of `_output` to the relevant
folder on the web server.

## Rebuild after editing the kernel

After changing the Jupyter kernel or extension source, run all three commands
from the repository root so the editable package and generated site include the
latest code:

```bash
pip install -e jupyterlite-sagecell-kernel
jupyter lite build
jupyter lite serve
```

## Install as a package

To install the published extension rather than work from a clone, run:

```bash
pip install jupyterlite-sagecell-kernel
jupyter lite build
```

## Uninstall

To remove the extension, run:

```bash
pip uninstall jupyterlite-sagecell-kernel
```

## Additional extension development commands

Run the following commands from the package subdirectory:

```bash
cd jupyterlite-sagecell-kernel

# Build the TypeScript source and development labextension.
jlpm run build

# Rebuild automatically after source changes.
jlpm run watch
```

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) and is installed with JupyterLab. Node.js must also
be installed and available on `PATH`.

For testing the extension in a full JupyterLab environment, create its
development link and start JupyterLab in another terminal while `jlpm run watch`
is running:

```bash
jupyter labextension develop . --overwrite
jupyter lab
```

To remove that development link, use `jupyter labextension list` to locate the
`labextensions` folder, then remove the symlink named
`@jupyterlite/sagecell-kernel`.

## Packaging the extension

See [RELEASE](RELEASE.md).
