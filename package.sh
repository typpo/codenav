#!/bin/bash -e

pushd `dirname $0`

pushd chrome
rm release.zip || true
zip -r release.zip *
popd

pushd firefox
cfx xpi
popd

popd
