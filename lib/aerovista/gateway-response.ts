/**
 * Classify non-JSON Identity Gateway rejection without reading or forwarding
 * an upstream HTML challenge page, one-time code, token or response body.
 *
 * A valid signed HMAC rejection from Identity Gateway normally arrives as
 * JSON (401 invalid_hmac, 403 service_not_authorized). A bare HTML 403
 * indicates an intervening HTTP policy/edge response or other non-JSON
 * upstream failure. Distinguish these without changing authorization.
 */
export function normalizeGatewayResponse(response:Response):Response{
  if(response.status!==403)return response;
  const contentType=response.headers.get("content-type")||"";
  if(/(?:\bjson\b|\+json)/i.test(contentType))return response;
  const proxiedByCloudflare=/cloudflare/i.test(response.headers.get("server")||"")||
    Boolean(response.headers.get("cf-ray"));
  const code=proxiedByCloudflare?"gateway_cloudflare_nonjson_403":"gateway_nonjson_403";
  return Response.json(
    {code,error:"The LotScope Identity Gateway call was rejected with a non-JSON HTTP 403 response."},
    {status:403,headers:{"cache-control":"no-store"}}
  );
}
