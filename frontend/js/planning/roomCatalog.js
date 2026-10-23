(function(root) {
  'use strict';
  // Concept design dimensions, feet. These are not statutory approval criteria.
  const catalog={
    size_master_bedroom:{min:[10,10],preferred:[11.25,20],max:[16,24]},
    size_bedroom_2:{min:[9,10],preferred:[11.5,11],max:[16,20]},
    size_living:{min:[10,8],preferred:[11.5,9.25],max:[20,24]},
    size_dining:{min:[8,7],preferred:[12,8],max:[16,20]},
    size_kitchen:{min:[8,7],preferred:[11.25,10],max:[16,20]},
    size_pooja:{min:[3,4],preferred:[5,7],max:[8,10]},
    size_study:{min:[7,8],preferred:[10,9],max:[16,20]}
  };
  const api={catalog}; root.RoomCatalog=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
