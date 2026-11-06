import React, { useMemo, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildWorld, CUTS } from './worlds.js';

const CREAM = '#f4ead2';
const Vig = {
  uniforms: { tDiffuse: { value: null }, k: { value: 0.3 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform sampler2D tDiffuse;uniform float k;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float d=distance(vUv,vec2(.5));c.rgb*=1.-k*smoothstep(.32,.85,d);gl_FragColor=c;}',
};

function makeComposer(gl, scene, camera, size) {
  const pr = gl.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(size.width * pr, size.height * pr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(gl, rt);
  composer.setPixelRatio(pr); composer.setSize(size.width, size.height);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 10, aperture: 0.00035, maxblur: 0.009 });
  composer.addPass(bokeh);
  composer.addPass(new ShaderPass(Vig));
  composer.addPass(new OutputPass());
  return { composer, bokeh };
}

function Scene({ t }) {
  const { gl, scene, camera, size } = useThree();
  const world = useMemo(() => buildWorld(), []);
  const comp = useRef(null);
  const tRef = useRef(t); tRef.current = t;
  useFrame(() => {
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    if (!comp.current) comp.current = makeComposer(gl, scene, camera, size);
    camera.fov = 80; camera.near = 0.2; camera.far = 500; camera.aspect = size.width / size.height; camera.updateProjectionMatrix();
    const s = world.update(tRef.current, camera, scene);
    comp.current.bokeh.uniforms.focus.value = s.focus;
    comp.current.composer.render();
  }, 1);
  return <primitive object={world.root} />;
}

export const Full = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  let cream = 0;
  CUTS.forEach((c) => { cream = Math.max(cream, 1 - Math.abs(t - c - 0.025) / 0.2); });
  cream = Math.max(0, Math.min(1, cream));
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 80, near: 0.2, far: 500, position: [0, 3, 10] }}>
        <Scene t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: CREAM, opacity: cream, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
