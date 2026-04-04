
export const ECO_CONSTANTS = {
  CO2_KG_PER_MEAL: 0.43,       
  WATER_L_PER_MEAL: 810,      
  METHANE_KG_PER_MEAL: 0.034, 
  CO2_KG_PER_TREE: 21,         
};


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
    treesEquivalent: treesEquivalent || 1, 
  };
}
