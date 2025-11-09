import { forwardRef } from 'react';

/**
 * Game Icon Component
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.size - Icon size in pixels (default: 32)
 * @param {React.Ref} ref - Forwarded ref
 */
const GameIcon = forwardRef(
  ({ stroke = '#000', strokeWidth = 4, className = '', size = 32, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 59 46"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        <path d="M34.6208 29.3334L45.4741 40.7574C46.3881 41.7192 47.5894 42.3586 48.8976 42.5798C50.2058 42.8009 51.5505 42.5919 52.7299 41.984C53.9093 41.3762 54.8597 40.4023 55.4386 39.2084C56.0176 38.0146 56.1938 36.6652 55.9408 35.3627L51.6741 13.4107M18.6208 13.3334V18.6667M15.9541 16.0001H21.2874M34.6208 16.0001H39.9541M38.6208 2.66675C42.157 2.66675 45.5484 4.07151 48.0489 6.57199C50.5493 9.07248 51.9541 12.4639 51.9541 16.0001C51.9541 19.5363 50.5493 22.9277 48.0489 25.4282C45.5484 27.9287 42.157 29.3334 38.6208 29.3334H23.9541L13.2474 40.6054C12.3316 41.5697 11.1272 42.2101 9.81565 42.4303C8.50414 42.6504 7.1566 42.4383 5.97612 41.826C4.79564 41.2136 3.84617 40.2341 3.27079 39.0352C2.69541 37.8363 2.5253 36.4828 2.78609 35.1787L7.14343 13.3841C7.74825 10.3613 9.3818 7.6415 11.7661 5.68749C14.1504 3.73349 17.1381 2.66602 20.2208 2.66675H38.6208Z" />
      </svg>
    );
  }
);

GameIcon.displayName = 'GameIcon';

export default GameIcon;
