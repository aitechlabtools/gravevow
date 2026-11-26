// Detalle de oficio de los retratos de mercader (mockups/detalle-mercaderes): píxeles que se pintan encima del humanoide,
// de cintura para arriba porque la tarjeta del Bastión recorta a cabeza y pecho. Solo vista frontal en reposo.
export type DetailRect = [number, number, number, number, string];
export const VENDOR_DETAIL: Record<string, DetailRect[]> = {
  vendor_brand: [[8,11,1,1,'#654e3f'],[11,11,1,1,'#654e3f'],[7,12,6,6,'#654e3f'],[7,12,1,6,'#4f3d31'],[8,14,4,1,'#4f3d31'],[13,6,5,3,'#0b0a0f'],[14,6,3,2,'#6d7580'],[14,7,3,1,'#575e66'],[16,6,1,2,'#e8752b'],[18,4,1,1,'#ffe08a'],[17,3,1,1,'#f2a23a'],[19,6,1,1,'#f2a23a']],
  vendor_orik: [[6,5,7,1,'#2a1c14'],[7,5,2,1,'#9fe3ff'],[10,5,2,1,'#9fe3ff'],[7,13,6,5,'#7a5230'],[7,13,1,5,'#5a3a1e'],[8,15,2,2,'#5a3a1e'],[11,15,1,2,'#5a3a1e'],[8,14,1,1,'#a3abb6'],[8,13,1,1,'#a3abb6']],
  vendor_garth: [[7,13,6,5,'#e9e1cc'],[7,13,1,5,'#d8cfb6'],[10,15,1,1,'#8a5a3a'],[8,16,1,1,'#8a5a3a'],[5,11,2,1,'#b02a2a'],[5,12,1,3,'#b02a2a'],[6,12,1,1,'#e9e1cc'],[5,13,1,1,'#e9e1cc']],
  vendor_nira: [[6,12,1,1,'#b8834a'],[7,13,1,1,'#b8834a'],[8,14,1,1,'#b8834a'],[9,15,1,1,'#b8834a'],[10,16,1,1,'#b8834a'],[6,11,1,1,'#a0703e'],[7,12,1,1,'#a0703e'],[8,13,1,1,'#a0703e'],[11,16,1,1,'#a0703e'],[14,11,3,6,'#0b0a0f'],[15,11,1,3,'#c8cdd3'],[15,14,1,2,'#7a5230'],[5,15,1,1,'#6b4a8a'],[5,16,1,1,'#6b4a8a']],
  vendor_eldrin: [[1,12,4,6,'#0b0a0f'],[2,12,1,1,'#cceeee'],[2,13,2,4,'#cceeee'],[2,15,2,2,'#5ab08a'],[3,14,1,1,'#5ab08a'],[1,10,1,1,'#b58cff'],[3,10,1,1,'#ffe08a'],[7,14,1,1,'#f8dc7a'],[11,13,1,1,'#f8dc7a'],[7,16,1,1,'#f8dc7a'],[11,15,1,1,'#f8dc7a']],
};
