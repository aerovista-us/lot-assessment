import "server-only";
import {getWorkbenchAccess} from "./session";
import {getAeroVistaServerAdapter} from "./app-adapter.server";
import {editorV2Allowed} from "./editor-v2-policy";

/** Feature activation is a server decision, not a NEXT_PUBLIC env security check.
 * Deny by default, require both founder role and explicit AVCC capability.
 */
export async function mayUseEditorV2():Promise<boolean>{
 if(process.env.LOTSCOPE_EDITOR_V2_RELEASE !== "enabled") return false;
 const session=await getWorkbenchAccess();
 if(!session)return false;
 const identity=session.identity as unknown as {roles?:unknown;effectiveRoles?:unknown};
 const roles=Array.isArray(identity.effectiveRoles)?identity.effectiveRoles:identity.roles;
 if(!editorV2Allowed({releaseEnabled:true,workbenchAuthorized:true,roles,capabilityAllowed:true}))return false;
 try{
  const check=await getAeroVistaServerAdapter().identity.can({
   identityId:session.identity.identityId,
   capability:"lotscope.workbench.editor_v2",
  });
  return editorV2Allowed({releaseEnabled:true,workbenchAuthorized:true,roles,capabilityAllowed:check.allowed===true});
 }catch{return false;}
}
