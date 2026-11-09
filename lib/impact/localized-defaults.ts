/** Translations of the built-in copy only. Custom campaign copy is never replaced. */
export const IMPACT_COPY: Record<string, Record<string, string>> = {
  "Make an impact for a child": { fr: "Changez la vie d’un enfant", de: "Bewirken Sie etwas für ein Kind", es: "Cambia la vida de un niño", pt: "Transforme a vida de uma criança", id: "Beri dampak bagi seorang anak" },
  "Choose the needs you want to cover and watch your impact take shape.": { fr: "Choisissez les besoins que vous souhaitez couvrir et voyez votre impact prendre forme.", de: "Wählen Sie die Bedürfnisse, die Sie decken möchten, und sehen Sie Ihre Wirkung entstehen.", es: "Elige las necesidades que deseas cubrir y observa cómo toma forma tu ayuda.", pt: "Escolha as necessidades que deseja atender e veja o seu impacto ganhar forma.", id: "Pilih kebutuhan yang ingin Anda penuhi dan lihat dampak bantuan Anda terbentuk." },
  Gaza: { fr: "Gaza", de: "Gaza", es: "Gaza", pt: "Gaza", id: "Gaza" },
  "Al-Quds": { fr: "Al-Quds", de: "Al-Quds", es: "Al-Quds", pt: "Al-Quds", id: "Al-Quds" },
  Sudan: { fr: "Soudan", de: "Sudan", es: "Sudán", pt: "Sudão", id: "Sudan" },
  Yemen: { fr: "Yémen", de: "Jemen", es: "Yemen", pt: "Iêmen", id: "Yaman" },
  Syria: { fr: "Syrie", de: "Syrien", es: "Siria", pt: "Síria", id: "Suriah" },
  "Clothing & shoes": { fr: "Vêtements et chaussures", de: "Kleidung und Schuhe", es: "Ropa y calzado", pt: "Roupas e calçados", id: "Pakaian dan sepatu" },
  Food: { fr: "Nourriture", de: "Nahrung", es: "Alimentos", pt: "Alimentos", id: "Makanan" },
  "Clean water": { fr: "Eau potable", de: "Sauberes Wasser", es: "Agua limpia", pt: "Água limpa", id: "Air bersih" },
  "Baby milk": { fr: "Lait infantile", de: "Babymilch", es: "Leche infantil", pt: "Leite infantil", id: "Susu bayi" },
  Shelter: { fr: "Abri", de: "Unterkunft", es: "Refugio", pt: "Abrigo", id: "Tempat tinggal" },
  Education: { fr: "Éducation", de: "Bildung", es: "Educación", pt: "Educação", id: "Pendidikan" },
  Medicine: { fr: "Soins médicaux", de: "Medizinische Versorgung", es: "Atención médica", pt: "Cuidados médicos", id: "Perawatan medis" },
  "Play & support": { fr: "Jeu et soutien", de: "Spiel und Unterstützung", es: "Juego y apoyo", pt: "Brincadeiras e apoio", id: "Bermain dan dukungan" },
};

export function completeImpactText(text: Record<string, string>): Record<string, string> {
  const translated = IMPACT_COPY[text.en];
  if (!translated) return text;
  const result = { ...text };
  for (const [locale, value] of Object.entries(translated)) if (!result[locale]?.trim()) result[locale] = value;
  return result;
}
