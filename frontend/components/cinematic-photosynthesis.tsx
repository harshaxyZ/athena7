import { useId } from "react"

const photons = [0, 1, 2, 3, 4]
const bubbles = [0, 1, 2, 3, 4, 5]
const molecules = [0, 1, 2, 3]

export function CinematicPhotosynthesis() {
  const id = useId().replace(/:/g, "")
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 960 540" role="img" aria-label="A cinematic animated journey through photosynthesis">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dff3ec"/><stop offset="1" stopColor="#f7f3df"/></linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#55d19a"/><stop offset=".48" stopColor="#159b69"/><stop offset="1" stopColor="#08734f"/></linearGradient>
        <radialGradient id={`${id}-sun`}><stop stopColor="#fff9b1"/><stop offset=".45" stopColor="#ffd765"/><stop offset="1" stopColor="#ff8b4a"/></radialGradient>
        <radialGradient id={`${id}-cell`}><stop stopColor="#b8f07c"/><stop offset=".65" stopColor="#4ebf68"/><stop offset="1" stopColor="#168355"/></radialGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#073b2b" floodOpacity=".22"/></filter>
        <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id={`${id}-soft`}><feGaussianBlur stdDeviation="18"/></filter>
        <clipPath id={`${id}-leafclip`}><path d="M421 439C354 296 419 122 674 67c45 174-23 342-253 372Z"/></clipPath>
      </defs>

      <g data-shot="world">
        <rect width="960" height="540" fill={`url(#${id}-sky)`}/>
        <circle data-sun cx="105" cy="98" r="62" fill={`url(#${id}-sun)`} filter={`url(#${id}-glow)`}/>
        <g data-cloud opacity=".55" fill="#fff"><ellipse cx="260" cy="82" rx="88" ry="24"/><ellipse cx="318" cy="73" rx="59" ry="31"/><ellipse cx="760" cy="112" rx="110" ry="30"/></g>
        <g data-rays fill="none" stroke="#ffc95a" strokeLinecap="round" filter={`url(#${id}-glow)`}>
          {[0,1,2,3].map(i=><path key={i} data-ray d={`M155 ${105+i*24} C270 ${105+i*19} 326 ${151+i*24} 430 ${186+i*28}`} strokeWidth={8-i} opacity={.9-i*.12}/>) }
        </g>
        <ellipse cx="538" cy="483" rx="260" ry="26" fill="#184d39" opacity=".13" filter={`url(#${id}-soft)`}/>
        <g data-leaf filter={`url(#${id}-shadow)`}>
          <path d="M421 439C354 296 419 122 674 67c45 174-23 342-253 372Z" fill={`url(#${id}-leaf)`}/>
          <g clipPath={`url(#${id}-leafclip)`} opacity=".24" fill="none" stroke="#d2ffd8">
            <path d="M423 437C493 318 565 205 666 86" strokeWidth="10"/>
            <path d="M489 335 613 318M525 280l-88-28M565 220l114-8M605 160l-75-35" strokeWidth="5"/>
          </g>
          <path d="M420 441C487 323 559 205 661 86" fill="none" stroke="#07583d" strokeLinecap="round" strokeWidth="13"/>
          <path d="M421 439c-21 37-42 60-75 79" fill="none" stroke="#07583d" strokeLinecap="round" strokeWidth="14"/>
        </g>
        <g data-droplets fill="#2a98d4" filter={`url(#${id}-glow)`}>
          {[0,1,2].map(i=><path key={i} data-droplet transform={`translate(${315-i*46} ${436+i*21}) scale(${1-i*.12})`} d="M0-18C8-6 15 2 15 11A15 15 0 1 1-15 11C-15 2-8-6 0-18Z"/>) }
        </g>
        <g data-co2 fill="#45534e">
          {molecules.map(i=><g key={i} data-molecule transform={`translate(${734+i*48} ${160+i*52})`}><circle r="13"/><circle cx="-18" r="8" opacity=".68"/><circle cx="18" r="8" opacity=".68"/></g>)}
        </g>
      </g>

      <g data-shot="inside" opacity="0">
        <rect width="960" height="540" fill="#092f29"/>
        <circle cx="478" cy="265" r="360" fill="#0d4438" opacity=".7"/>
        <g data-cellwall fill="none" stroke="#56bc76" opacity=".3">
          {[0,1,2,3,4].map(i=><ellipse key={i} cx={180+i*175} cy={90+(i%2)*340} rx="155" ry="105" strokeWidth="8"/>) }
        </g>
        <g data-chloroplast transform="translate(480 270)" filter={`url(#${id}-shadow)`}>
          <ellipse rx="276" ry="178" fill={`url(#${id}-cell)`} stroke="#a6ef91" strokeWidth="7"/>
          <ellipse rx="250" ry="151" fill="none" stroke="#d4ffb4" strokeWidth="3" opacity=".42"/>
          {[-145,-72,0,72,145].map((x,i)=><g key={x} data-granum transform={`translate(${x} ${i%2?-34:26})`}>
            {[-22,-11,0,11,22].map(y=><ellipse key={y} cy={y} rx="49" ry="12" fill="#156844" stroke="#8ad47c" strokeWidth="2"/>) }
          </g>)}
          <path d="M-205-66C-120-115 20-85 218-112M-214 83C-70 128 68 72 225 102" fill="none" stroke="#b2ed90" strokeWidth="6" opacity=".48"/>
        </g>
        <g data-photons filter={`url(#${id}-glow)`}>{photons.map(i=><circle key={i} data-photon cx={72+i*64} cy={84+i*18} r={12-i*.7} fill="#ffe165"/>)}</g>
        <g data-electrons fill="#9af1ff" filter={`url(#${id}-glow)`}>{photons.map(i=><circle key={i} data-electron cx={310+i*70} cy={270+(i%2?32:-30)} r="8"/>)}</g>
        <g data-oxygen fill="#bbf4ff">{bubbles.map(i=><g key={i} data-bubble transform={`translate(${685+i*29} ${350-i*34})`}><circle r={11-i*.5} opacity=".76"/><circle cx="-12" cy="5" r="7" opacity=".5"/></g>)}</g>
        <text x="480" y="489" textAnchor="middle" fill="#d9ffe8" fontSize="19" fontWeight="600" letterSpacing="4">INSIDE THE CHLOROPLAST</text>
      </g>

      <g data-shot="finale" opacity="0">
        <rect width="960" height="540" fill="#f3f0df"/>
        <circle cx="480" cy="262" r="210" fill="#f8d66d" opacity=".16" filter={`url(#${id}-glow)`}/>
        <g data-glucose transform="translate(480 258)" filter={`url(#${id}-shadow)`}>
          <path d="m0-112 97 56v112L0 112-97 56V-56Z" fill="#fff7d3" stroke="#efaa3c" strokeWidth="10"/>
          {[[-97,-56],[0,-112],[97,-56],[97,56],[0,112],[-97,56]].map(([x,y],i)=><g key={i} data-atom transform={`translate(${x} ${y})`}><circle r="29" fill={i%3===0?"#ef6b54":"#f0ba41"}/><circle r="11" fill="#fff" opacity=".62"/></g>)}
          <circle r="34" fill="#25a574"/><text y="9" textAnchor="middle" fill="#fff" fontSize="25" fontWeight="800">C</text>
        </g>
        <g data-product-label opacity="0"><text x="480" y="432" textAnchor="middle" fill="#183f34" fontSize="35" fontWeight="800">GLUCOSE</text><text x="480" y="466" textAnchor="middle" fill="#49685f" fontSize="18">stored sunlight, ready to fuel life</text></g>
        <g data-sparkles fill="#f0ba41">{photons.map(i=><path key={i} data-sparkle transform={`translate(${210+i*135} ${118+(i%2)*295}) scale(${.7+i*.08})`} d="M0-18 5-5 18 0 5 5 0 18-5 5-18 0-5-5Z"/>)}</g>
      </g>
    </svg>
  )
}
