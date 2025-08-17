import Image from "next/image";
import * as React from "react";
const NonTrivial = () => {
  return (
    <>
      <div className="hidden dark:block">
        <Image
          src="../../../assets/nontrivialdark.png"
          alt="Non-Trivial logo"
          placeholder="blur"
          height={48}
        />
      </div>
      <div className="dark:hidden">
        <Image
          src="../../../assets/nontrivial.png"
          alt="Non-Trivial logo"
          placeholder="blur"
          height={48}
        />
      </div>
    </>
  );
};
export default NonTrivial;
