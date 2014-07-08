#!/bin/bash -e

pushd `dirname $0`

pushd chrome
rm release.zip || true
zip -r ../chrome_release.zip *
popd

popd
