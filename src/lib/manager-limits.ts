// Kapasitetene speiler manager_squad_capacity() og manager_storage_capacity() i
// databasen. Endrer du dem her, må migrasjonen endres i samme slengen.
export const squadCapacity = 23;
export const storageCapacity = 80;

// Økonomireglene speiler 0033_fc_economy.sql. Katalogprisen er kortets verdi.
export const catalogBuyMaxOverall = 83;
export const marketListingLimit = 10;
export const quickSellValue = (value: number) => Math.floor(value * 0.25);
export const marketPriceRange = (value: number) => ({ min: Math.max(1, Math.ceil(value * 0.25)), max: Math.floor(value * 4) });
