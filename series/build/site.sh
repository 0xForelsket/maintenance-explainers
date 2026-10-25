#!/bin/bash
# assemble a publishable interactive page for a topic: site/<topic>/
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"
T=$1; TITLE=$2
D=$R/site/$T
rm -rf $D && mkdir -p $D
sed "s|{{TITLE}}|$TITLE|" $R/shell/page.html > $D/index.html
cp $R/shell/look.js $D/look.js
cp $R/shell/injection.js $D/injection.js
for f in scene.js story.js page.js; do cp $R/topics/$T/$f $D/; done
# local test copy (local three + charset)
sed 's#https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js#/node_modules/three/build/three.module.js#; s#https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/#/node_modules/three/examples/jsm/#; s#https://cdn.jsdelivr.net/npm/three-bvh-csg@0.0.16/build/#/node_modules/three-bvh-csg/build/#; s#https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.8.3/build/#/node_modules/three-mesh-bvh/build/#; 1i <meta charset="utf-8">' $D/index.html | grep -v fonts.googleapis > $D/test_local.html
ls $D
