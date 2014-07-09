#!/bin/bash
# Set up hardlinks.  Run this script so you only need to edit src/* and changes
# will apply for both Firefox and Chrome.  Unfortunately browsers won't pick up
# symlinks in plugins.

pushd `dirname $0`
ln src/inject* firefox/data
ln src/inject* chrome/src/inject
ln src/lib/jquery.min.js firefox/data
ln src/lib/jquery.min.js chrome/src/lib
popd
