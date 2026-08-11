import {Composition, registerRoot} from 'remotion';
import {
  BeforeAfter,
  beforeAfterSchema,
  beforeAfterDefaults,
  beforeAfterDuration,
} from './BeforeAfter';
import {
  ProductAd,
  productAdSchema,
  productAdDefaults,
  productAdDuration,
  type ProductAdProps,
} from './ProductAd';

const Root: React.FC = () => (
  <>
    <Composition
      id="BeforeAfter"
      component={BeforeAfter}
      // Length now depends on how many extra shots the job has — each adds 1.8s
      // before the sell card — so it can't be a constant.
      durationInFrames={beforeAfterDuration()}
      calculateMetadata={({props}) => ({
        durationInFrames: beforeAfterDuration(props.extraUrls?.length ?? 0),
      })}
      fps={30}
      width={1080}
      height={1920}
      schema={beforeAfterSchema}
      defaultProps={beforeAfterDefaults}
    />
    {/* Our own ad. Every variant has a different scene count and copy length,
        so the duration is computed from the props, never assumed. */}
    <Composition
      id="ProductAd"
      component={ProductAd}
      durationInFrames={productAdDuration(productAdDefaults)}
      calculateMetadata={({props}) => ({
        durationInFrames: productAdDuration(props as ProductAdProps),
      })}
      fps={30}
      width={1080}
      height={1920}
      schema={productAdSchema}
      defaultProps={productAdDefaults}
    />
  </>
);

registerRoot(Root);
