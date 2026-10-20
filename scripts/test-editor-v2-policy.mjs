import assert from "node:assert/strict";
import {editorV2Allowed} from "../lib/aerovista/editor-v2-policy.ts";
const valid={releaseEnabled:true,workbenchAuthorized:true,roles:["founder","admin"],capabilityAllowed:true};
assert.equal(editorV2Allowed(valid),true);
for(const change of [
 {releaseEnabled:false},{workbenchAuthorized:false},{roles:["admin","staff"]},
 {roles:["client"]},{roles:["guest"]},{roles:[]},{roles:undefined},
 {roles:null},{roles:"founder"},{capabilityAllowed:false}
]){
 assert.equal(editorV2Allowed({...valid,...change}),false,JSON.stringify(change));
}
console.log("PASS: Editor V2 founder role, capability, release and session fail-closed policy");
