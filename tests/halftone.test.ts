import {describe,expect,it} from 'vitest';
import {createCellMaskFromImageData,expandCellMask,type CellMask} from '../src/pixel-grid';
import {cellsToPath,type PixelizeOptions} from '../src/font-pixelizer';
const metrics={unitsPerEm:1000,ascender:800,descender:-200};
const options={pixelsPerEm:10,threshold:0.1,expand:0,pixelShape:'halftone'} as PixelizeOptions;
describe('halftone coverage and outlines',()=>{
 it('keeps continuous ink coverage separately from the threshold mask',()=>{
  const data=Uint8ClampedArray.from([0,0,0,64,0,0,0,255,0,0,0,0]);
  const mask=createCellMaskFromImageData({data,width:3,height:1,cellSize:1,threshold:0.3,mode:'alpha'});
  expect(Array.from(mask.cells)).toEqual([0,1,0]);
  expect(mask.coverage?.[0]).toBeCloseTo(64/255);expect(mask.coverage?.[1]).toBe(1);expect(mask.coverage?.[2]).toBe(0);
  const dark=createCellMaskFromImageData({data:Uint8ClampedArray.from([128,128,128,255]),width:1,height:1,cellSize:1,threshold:0.2,mode:'darkness'});
  expect(dark.coverage?.[0]).toBeCloseTo(127/255);
 });
 it('uses dot area proportional to coverage, with gaps and no dots below threshold',()=>{
  const mask={cols:3,rows:1,cells:Uint8Array.from([1,1,0]),coverage:Float32Array.from([0.25,1,0.05])};
  const path=cellsToPath(mask,metrics,options);
  expect(path.commands.filter(c=>c.type==='C')).toHaveLength(8);
  expect(path.commands.filter(c=>c.type==='L')).toHaveLength(0);
  const moves=path.commands.filter(c=>c.type==='M');expect(moves).toHaveLength(2);
  expect(moves[0]).toMatchObject({x:72.5,y:750});expect(moves[1]).toMatchObject({x:195,y:750});
  expect(path.getBoundingBox().x2).toBeLessThan(200);
 });
 it('propagates strongest active coverage through expand without promoting rejected cells',()=>{
  const mask={cols:5,rows:1,cells:Uint8Array.from([1,0,1,0,0]),coverage:Float32Array.from([0.25,0.1,1,0,0])};
  const expanded=expandCellMask(mask,1);
  expect(Array.from(expanded.cells)).toEqual([1,1,1,1,0]);
  expect(Array.from(expanded.coverage!)).toEqual([0.25,1,1,1,0]);
  expect(Array.from(mask.coverage)).toEqual([0.25,expect.closeTo(0.1),1,0,0]);
 });
 it('supports binary masks and never emits invalid or zero-area halftone outlines',()=>{
  const binary:CellMask={cols:1,rows:1,cells:Uint8Array.of(1)};
  expect(cellsToPath(binary,metrics,options).commands.filter(c=>c.type==='C')).toHaveLength(4);
  const blank={...binary,coverage:Float32Array.of(0)};
  expect(cellsToPath(blank,metrics,options).commands).toHaveLength(0);
  expect(cellsToPath({...binary,coverage:Float32Array.of(NaN)},metrics,options).commands).toHaveLength(0);
  expect(cellsToPath({...binary,coverage:Float32Array.of(-1)},metrics,options).commands).toHaveLength(0);
  expect(cellsToPath({...binary,coverage:Float32Array.of(2)},metrics,options).getBoundingBox().x2).toBe(95);
 });
});
