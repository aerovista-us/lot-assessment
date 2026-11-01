import type {LotAssessmentInput} from './assessment';
import type {ConfidenceMap,FactState} from './confidence';
import type {IrregularLotSnapshot} from '@/components/IrregularLotSketch';

export const STUDY_STORAGE_KEY='lotscope.public.study.v1';
const INPUT_KEYS=[
 'lotWidthFt','lotDepthFt','frontSetbackFt','rearSetbackFt','leftSetbackFt',
 'rightSetbackFt','maxLotCoveragePct','units','livingAreaPerUnitSqFt','stories',
 'garageSpacesPerUnit','drivewayWidthFt','minimumAccessWidthFt'
] as const;
const confidenceValues:ReadonlyArray<FactState>=['CONFIRMED','USER_SUPPLIED','ASSUMED','UNKNOWN'];
export type PublicStudy={
 schema:'lotscope-public-study-v1';savedAt:string;
 input:LotAssessmentInput;confidence:ConfidenceMap;lotMode:'RECTANGLE'|'CUSTOM';
 customLot:IrregularLotSnapshot|null;
};

/** Local documents never represent a surveyed parcel or a paid project. */
export function createPublicStudy(input:LotAssessmentInput,confidence:ConfidenceMap,lotMode:'RECTANGLE'|'CUSTOM',customLot:IrregularLotSnapshot|null):PublicStudy{
 return {schema:'lotscope-public-study-v1',savedAt:new Date().toISOString(),input:{...input},confidence:{...confidence},lotMode,customLot:lotMode==='CUSTOM'?customLot:null};
}

export function parsePublicStudy(value:unknown):PublicStudy{
 if(!value||typeof value!=='object')throw Error('Invalid LotScope study file.');
 const item=value as Record<string,unknown>;
 if(item.schema!=='lotscope-public-study-v1')throw Error('Unsupported LotScope study version.');
 if(typeof item.savedAt!=='string'||!Number.isFinite(Date.parse(item.savedAt)))throw Error('Invalid study timestamp.');
 if(!item.input||typeof item.input!=='object'||!item.confidence||typeof item.confidence!=='object')throw Error('Missing study values.');
 const rawInput=item.input as Record<string,unknown>;
 const rawConfidence=item.confidence as Record<string,unknown>;
 for(const key of INPUT_KEYS){
  const v=rawInput[key];
  if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1_000_000)throw Error('Invalid value for '+key+'.');
  if(!confidenceValues.includes(rawConfidence[key] as FactState))throw Error('Invalid confidence for '+key+'.');
 }
 if(typeof rawInput.garageIntegrated!=='boolean'||!confidenceValues.includes(rawConfidence.garageIntegrated as FactState))throw Error('Invalid garage state.');
 if(item.lotMode!=='RECTANGLE'&&item.lotMode!=='CUSTOM')throw Error('Invalid parcel mode.');
 let customLot:IrregularLotSnapshot|null=null;
 if(item.lotMode==='CUSTOM'){
  if(!item.customLot||typeof item.customLot!=='object')throw Error('Missing irregular parcel.');
  const p=item.customLot as IrregularLotSnapshot;
  if(!Array.isArray(p.points)||p.points.length<3||p.points.length>36 ||
   p.points.some(point=>!Array.isArray(point)||point.length!==2||point.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>1e6)) ||
   !Number.isInteger(p.frontageEdge)||p.frontageEdge<0||p.frontageEdge>=p.points.length ||
   typeof p.frontageStreet!=='string'||p.frontageStreet.length>120 ||
   ![p.areaSqFt,p.frontageLengthFt,p.boundingWidthFt,p.boundingDepthFt,p.screenWidthFt,p.screenDepthFt].every(n=>Number.isFinite(n)&&n>=0&&n<=1e9) ||
   p.complete!==true||p.simple!==true)throw Error('Invalid irregular lot geometry.');
  customLot=p;
 }
 const input=Object.fromEntries(INPUT_KEYS.map(k=>[k,rawInput[k]])) as unknown as LotAssessmentInput;
 input.garageIntegrated=rawInput.garageIntegrated as boolean;
 const confidence=Object.fromEntries([...INPUT_KEYS,'garageIntegrated'].map(k=>[k,rawConfidence[k]])) as ConfidenceMap;
 return {schema:'lotscope-public-study-v1',savedAt:item.savedAt,input,confidence,lotMode:item.lotMode,customLot};
}
