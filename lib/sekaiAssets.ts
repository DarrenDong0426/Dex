const BASE = "https://storage.sekai.best/sekai-jp-assets";

export function cardThumbnail(assetbundleName: string, trained: boolean) {
  const variant = trained ? "after_training" : "normal";
  return `${BASE}/thumbnail/chara/${assetbundleName}_${variant}.webp`;
}
