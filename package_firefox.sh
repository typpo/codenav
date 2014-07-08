#!/bin/bash -e

pushd `dirname $0`

pushd firefox
cfx xpi
popd

popd
