/**
 * Environmental constants per meal saved (approx. 0.5kg - 1kg of food)
 * Based on research from Too Good To Go, FAO, and EPA.
 */
export const ECO_CONSTANTS = {
  CO2_KG_PER_MEAL: 0.43,       // kg of CO2e prevented per meal
  WATER_L_PER_MEAL: 810,       // Liters of agricultural water saved per meal
  METHANE_KG_PER_MEAL: 0.034,  // kg of fugitive methane prevented from landfill
  CO2_KG_PER_TREE: 21,         // kg of CO2 absorbed by one mature tree per year
};

/**
 * Calculates the total environmental impact for a given number of meals saved.
 * @param {number} mealsCount - Sum of item quantities in rescued orders.
 */
export function calculateEcoImpact(mealsCount) {
  const count = Number(mealsCount) || 0;
  
  const co2Prevented = count * ECO_CONSTANTS.CO2_KG_PER_MEAL;
  const waterSaved = Math.round(count * ECO_CONSTANTS.WATER_L_PER_MEAL);
  const methanePrevented = count * ECO_CONSTANTS.METHANE_KG_PER_MEAL;
  const treesEquivalent = Math.max(0, Math.floor(co2Prevented / ECO_CONSTANTS.CO2_KG_PER_TREE));

  return {
    mealsSaved: count,
    co2Prevented: co2Prevented.toFixed(1),
    waterSaved: waterSaved,
    methanePrevented: methanePrevented.toFixed(2),
    treesEquivalent: treesEquivalent || 1, // Minimum 1 if any meals saved to motivate user
  };
}
