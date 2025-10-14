type Props = {
  size?: number;
  showName?: boolean;
};

export default function BrandLogo({ size = 28, showName = false }: Props) {
  const primary =
    localStorage.getItem("brand.primary") ||
    (import.meta.env.VITE_BRAND_PRIMARY as string) ||
    "#2563eb";

  const logo = localStorage.getItem("brand.logoDataUrl");
  const name =
    localStorage.getItem("brand.name") ||
    (import.meta.env.VITE_BRAND_NAME as string) ||
    "Sistema Hostales";

  return (
    <div className="flex items-center gap-2">
      {logo ? (
        <img
          src={logo}
          alt={name}
          style={{ width: size, height: size }}
          className="rounded-lg ring-1 ring-black/5 object-contain"
        />
      ) : (
        <div
          className="grid place-items-center rounded-lg text-white font-bold"
          style={{ width: size, height: size, backgroundColor: primary }}
          aria-label={name}
          title={name}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      {showName && <span className="font-semibold text-white">{name}</span>}
    </div>
  );
}
