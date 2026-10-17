/** Pure policy decision: default deny. Server callers supply verified identity/AVCC outcomes. */
export function editorV2Allowed(input:{
 releaseEnabled:boolean;
 workbenchAuthorized:boolean;
 roles:unknown;
 capabilityAllowed:boolean;
}):boolean{
 return input.releaseEnabled===true
  && input.workbenchAuthorized===true
  && Array.isArray(input.roles)
  && input.roles.includes("founder")
  && input.capabilityAllowed===true;
}
