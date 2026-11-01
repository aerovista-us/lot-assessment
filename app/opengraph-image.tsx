import {ImageResponse} from 'next/og';

export const runtime='edge';
export const alt='LotScope architectural site intelligence — build starts with the lot';
export const size={width:1200,height:630};
export const contentType='image/png';

export default function Image(){
 return new ImageResponse(
  <div style={{display:'flex',width:'100%',height:'100%',padding:'62px',background:'#0b1720',color:'#ecf5f5',fontFamily:'Arial,sans-serif',justifyContent:'space-between'}}>
   <div style={{display:'flex',flexDirection:'column',width:'58%',justifyContent:'space-between'}}>
    <div style={{display:'flex',alignItems:'center',gap:'15px'}}>
     <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:53,height:53,border:'1px solid #8acbd6',borderRadius:'8px',color:'#a9e3ea',fontSize:20,fontWeight:900}}>LS</div>
     <div style={{display:'flex',flexDirection:'column'}}><span style={{fontSize:29,fontWeight:900}}>LotScope <span style={{color:'#93ced8'}}>/ Site Studio</span></span><span style={{fontSize:13,color:'#91afba',letterSpacing:2}}>AEROVISTA LOCAL</span></div>
    </div>
    <div style={{display:'flex',flexDirection:'column'}}>
     <div style={{display:'flex',fontSize:19,fontWeight:700,color:'#94cfd9',letterSpacing:2,marginBottom:20}}>LAND INTELLIGENCE / 01</div>
     <div style={{display:'flex',flexDirection:'column',fontSize:64,lineHeight:1.03,fontWeight:800,letterSpacing:-2}}>
      <span>Every great build</span><span>starts with <span style={{color:'#a8e2e9'}}>the lot.</span></span>
     </div>
     <div style={{display:'flex',fontSize:21,color:'#bacfd3',marginTop:25}}>Study the parcel. Test the program. Know the limits.</div>
    </div>
    <div style={{display:'flex',gap:15,fontSize:14,color:'#9cb8c1',borderTop:'1px solid #3d5d68',paddingTop:17}}>
     <span>SETBACKS</span><span>·</span><span>FOOTPRINT</span><span>·</span><span>SCENARIOS</span><span>·</span><span>DESIGN</span>
    </div>
   </div>
   <div style={{display:'flex',alignItems:'center',width:'40%',height:'100%',border:'1px solid #557c89',borderRadius:12,background:'#112630',padding:15}}>
    <svg width="435" height="450" viewBox="0 0 435 450">
     <defs><pattern id="og-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" stroke="#446977" strokeWidth=".7" fill="none" opacity=".5"/></pattern></defs>
     <rect width="435" height="450" fill="url(#og-grid)"/>
     <polygon points="119,92 316,92 316,327 277,327 260,353 119,353" fill="#426577" fillOpacity=".28" stroke="#d2e5e8" strokeWidth="2"/>
     <polygon points="144,117 290,117 290,310 259,328 144,328" fill="#3a7d87" fillOpacity=".22" stroke="#83c9d6" strokeWidth="2" strokeDasharray="8 6"/>
     <rect x="176" y="158" width="82" height="119" fill="#a17851" fillOpacity=".5" stroke="#e9be8e" strokeWidth="2"/>
     <line x1="217" y1="158" x2="217" y2="277" stroke="#e9be8e" strokeWidth="1.5" strokeDasharray="5 4"/>
    </svg>
   </div>
  </div>,size
 );
}
