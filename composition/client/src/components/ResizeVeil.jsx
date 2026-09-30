import { useEffect, useState } from "react";
import { subscribeToResizeActivity } from "../utils/resizeActivity.js";

const ResizeVeil = () => {
  const [isResizing, setIsResizing] = useState(false);

  useEffect(
    () =>
      subscribeToResizeActivity({
        target: window,
        onChange: setIsResizing,
      }),
    [],
  );

  return (
    <div
      className={`resizeVeil${isResizing ? " resizeVeilActive" : ""}`}
      aria-hidden="true"
    />
  );
};

export default ResizeVeil;
