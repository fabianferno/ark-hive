import Image from "next/image";

type AppBrandProps = {
  size?: "sm" | "lg";
  showIcon?: boolean;
};

export function AppBrand({ size = "sm", showIcon = true }: AppBrandProps) {
  const text = size === "lg" ? "text-2xl" : "text-sm";
  const logo = size === "lg" ? 52 : 32;

  return (
    <div className={`inline-flex items-center gap-2 font-display font-semibold tracking-tight ${text}`}>
      {showIcon && (
        <Image
          src="/logo.jpg"
          alt=""
          width={logo}
          height={logo}
          className="shrink-0 rounded-md"
          aria-hidden
          priority={size === "lg"}
        />
      )}
      <span>
        <span className="text-fg text-2xl!">Ark</span>
        <span className="font-normal text-2xl! text-fg-faint">-</span>
        <span className="text-accent">Hive</span>
      </span>
    </div>
  );
}
