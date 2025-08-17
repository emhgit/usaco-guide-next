import Image from "next/image";
import * as React from "react";
const EasyFunCoding = () => {
  return (
    <>
      <div className="hidden dark:block">
        <Image
          src="../../../assets/easyfuncoding.png"
          alt="EasyFunCoding logo"
          placeholder="blur"
          height={48}
        />
      </div>
      <div className="dark:hidden">
        <Image
          src="../../../assets/easyfuncoding.jpg"
          alt="EasyFunCoding logo"
          placeholder="blur"
          height={48}
        />
      </div>
    </>
  );
};
export default EasyFunCoding;
