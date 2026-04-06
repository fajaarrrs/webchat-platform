import { useEffect, useState } from 'react';

const MOBILE_MAX = 640;
const TABLET_MAX = 1024;

export default function useBreakpoint() {
  const getWidth = () => window.innerWidth;
  const [width, setWidth] = useState(getWidth);

  useEffect(() => {
    const handleResize = () => setWidth(getWidth());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width,
    isMobile: width <= MOBILE_MAX,
    isTablet: width > MOBILE_MAX && width <= TABLET_MAX,
  };
}
