// Kapasitetene speiler manager_squad_capacity() og manager_storage_capacity() i
// databasen. Endrer du dem her, må migrasjonen endres i samme slengen.
export const squadCapacity = 23;
// Lageret er i praksis ubegrenset (0038_unlimited_storage.sql).
export const storageCapacity = 1_000_000;

// Økonomireglene speiler 0033_fc_economy.sql. Katalogprisen er kortets verdi.
export const catalogBuyMaxOverall = 83;
export const marketListingLimit = 10;
// Inform gir litt mer enn vanlige kort ved hurtigsalg (0067_special_pack_tots_and_inform_quick_sell.sql).
export const quickSellValue = (value: number, special?: string | null) => Math.floor(value * (special === "inform" ? 0.3 : 0.25));
export const marketPriceRange = (value: number) => ({ min: Math.max(1, Math.ceil(value * 0.25)), max: Math.floor(value * 4) });
