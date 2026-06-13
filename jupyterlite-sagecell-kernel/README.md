# jupyterlite-sagecell-kernel

A remote SageCell wrapper kernel for JupyterLite. The kernel sends each executed
cell to [SageMathCell](https://sagecell.sagemath.org/) and displays the result in
an iframe.

## Requirements

- JupyterLite >= 0.6.0
- Network access to `https://sagecell.sagemath.org`

## Install

To install the extension, execute:

```bash
pip install jupyterlite-sagecell-kernel
```

Then build your JupyterLite site:

```bash
jupyter lite build
```

Select **SageCell (remote)** when creating a notebook or choosing a kernel.

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlite-sagecell-kernel
```

## Contributing

### Development install

An editable install builds the TypeScript extension from source, so Node.js and
npm must be installed and available on `PATH` before running `pip install -e .`.
For example, install them into the active conda environment with:

```bash
conda install -c conda-forge nodejs
```

Verify that both executables are available, then install the package:

```bash
node --version
npm --version

# Clone the repo to your local environment
# Change directory to the jupyterlite-sagecell-kernel directory
# Install package in development mode
python -m pip install -e .

# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite

# Rebuild extension Typescript source after making changes
jlpm run build
```

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) and is installed with JupyterLab. The editable
build runs `jlpm` in an isolated Python build environment, but `node` and `npm`
must still be installed separately on the system or in the active environment.
If editable-install metadata generation fails with `Please install Node.js and
npm before continuing installation`, install Node.js as shown above, confirm
that `node --version` succeeds in the same shell, and retry the install.

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

### Development uninstall

```bash
pip uninstall jupyterlite-sagecell-kernel
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `@jupyterlite/sagecell-kernel` within that folder.

### Packaging the extension

See [RELEASE](RELEASE.md)
