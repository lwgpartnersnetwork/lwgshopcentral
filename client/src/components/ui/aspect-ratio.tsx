// client/src/components/ui/aspect-ratio.tsx
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

/**
 * AspectRatio keeps its content (like an <img>) locked to a given ratio.
 * Usage:
 *  <AspectRatio ratio={16 / 9}>
 *    <img src="/hero.jpg" className="h-full w-full object-cover" />
 *  </AspectRatio>
 */
const AspectRatio = AspectRatioPrimitive.Root;

export { AspectRatio };
