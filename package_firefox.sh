#!/bin/bash -e

pushd `dirname $0`

pushd firefox
#cfx xpi --update-link http://ianww.com/codenav/firefox_latest --update-url http://ianww.com/codenav/firefox_update_rdf
cfx xpi
mv codenav.xpi ..
popd

popd
