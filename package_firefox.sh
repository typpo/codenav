#!/bin/bash -e

pushd `dirname $0`

./setup_hardlinks.sh

pushd firefox
jpm xpi
mv *.xpi ../codenav.xpi
popd

popd
