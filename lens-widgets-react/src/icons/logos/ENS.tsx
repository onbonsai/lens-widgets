export function ENSLogo({ isDarkTheme }: { isDarkTheme: boolean }) {
  const fill = isDarkTheme ? "black" : "white";

  return (
    <svg
      viewBox="0 0 328 328"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={iconStyle}
    >
      <g clip-path="url(#clip0_1206_50)">
        <path
          d="M38.423 77.1727C41.4917 71.4759 45.9204 66.6192 51.3185 63.0311L141.912 0L49.088 152.931C49.088 152.931 40.9776 139.275 37.8145 132.365C33.8729 123.677 31.885 114.236 31.99 104.702C32.0951 95.1681 34.2908 85.7724 38.423 77.1727ZM1.03383 182.669C2.05669 197.294 6.20381 211.532 13.1975 224.43C20.1912 237.329 29.87 248.589 41.5859 257.458L141.79 327.075C141.79 327.075 79.0965 237.054 26.2167 147.477C20.8631 138.013 17.2641 127.666 15.592 116.931C14.8518 112.07 14.8518 107.125 15.592 102.264C14.2132 104.81 11.5368 110.022 11.5368 110.022C6.17499 120.917 2.52334 132.568 0.709417 144.568C-0.33466 157.252 -0.22608 170.004 1.03383 182.669ZM256.512 194.79C253.267 187.881 245.238 174.224 245.238 174.224L152.577 327.075L243.17 264.084C248.568 260.496 252.997 255.64 256.066 249.943C260.198 241.343 262.393 231.947 262.499 222.414C262.604 212.88 260.616 203.438 256.674 194.75L256.512 194.79ZM293.292 144.446C292.269 129.822 288.122 115.583 281.129 102.685C274.135 89.7869 264.456 78.5263 252.74 69.6575L152.698 0C152.698 0 215.351 90.0213 268.272 179.598C273.611 189.065 277.196 199.412 278.856 210.144C279.596 215.005 279.596 219.95 278.856 224.811C280.235 222.265 282.911 217.053 282.911 217.053C288.273 206.158 291.925 194.507 293.738 182.507C294.796 169.824 294.701 157.072 293.455 144.406L293.292 144.446Z"
          fill={fill}
        />
        {/* <path
          d="M462.772 236H367.912V85.652H462.772V114.008H389.332L398.512 105.44V146.648H455.632V173.576H398.512V216.212L389.332 207.644H462.772V236Z"
          fill="white"
        />
        <path
          d="M518.389 236H487.993V85.652H518.389L593.461 199.076H584.281V85.652H614.473V236H584.281L509.005 122.78H518.389V236Z"
          fill="white"
        />
        <path
          d="M634.374 128.696C634.374 119.72 636.686 111.832 641.31 105.032C646.07 98.096 652.53 92.656 660.69 88.712C668.986 84.768 678.438 82.796 689.046 82.796C699.654 82.796 708.766 84.7 716.382 88.508C724.134 92.18 730.118 97.416 734.334 104.216C738.686 111.016 740.862 119.108 740.862 128.492H710.466C710.33 122.78 708.29 118.292 704.346 115.028C700.538 111.764 695.302 110.132 688.638 110.132C681.43 110.132 675.65 111.696 671.298 114.824C667.082 117.952 664.974 122.236 664.974 127.676C664.974 132.572 666.266 136.38 668.85 139.1C671.57 141.684 675.718 143.588 681.294 144.812L704.346 149.708C717.538 152.428 727.33 157.12 733.722 163.784C740.114 170.448 743.31 179.628 743.31 191.324C743.31 200.844 740.998 209.208 736.374 216.416C731.75 223.488 725.154 228.996 716.586 232.94C708.154 236.748 698.226 238.652 686.802 238.652C675.922 238.652 666.334 236.816 658.038 233.144C649.878 229.336 643.554 224.032 639.066 217.232C634.578 210.296 632.266 202.272 632.13 193.16H662.73C662.73 198.872 664.838 203.36 669.054 206.624C673.406 209.752 679.39 211.316 687.006 211.316C694.894 211.316 701.15 209.82 705.774 206.828C710.398 203.7 712.71 199.552 712.71 194.384C712.71 189.76 711.554 186.224 709.242 183.776C706.93 181.192 703.054 179.356 697.614 178.268L674.358 173.372C661.166 170.652 651.17 165.552 644.37 158.072C637.706 150.592 634.374 140.8 634.374 128.696Z"
          fill="white"
        /> */}
      </g>
      <defs>
        <clipPath id="clip0_1206_50">
          <rect width="328" height="328" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

const iconStyle = {
  marginTop: "8px",
  height: 28,
  width: 52,
};
