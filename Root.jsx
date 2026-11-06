import React from 'react';
import { Composition } from 'remotion';
import { Full } from './Full.jsx';
export const Root = () => (
  <Composition id="Galveston" component={Full} durationInFrames={1963} fps={30} width={720} height={1280} />
);
