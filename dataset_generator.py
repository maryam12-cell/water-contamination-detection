import urllib.parse
import os
import requests
import time

prompts = [
    # NOT CONTAMINATED - River (1-13)
    "A clean river flowing over smooth stones with crystal-clear transparent water, green trees on both banks, bright morning sunlight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A wide clean mountain river in northern Pakistan with clear turquoise water and rocky banks, midday sunlight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of a clean river surface with transparent water showing pebbles on the riverbed, soft daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean river seen from a bridge, clear greenish-blue water, grassy banks, afternoon light, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A calm clean river at sunrise, clear water reflecting the sky, light morning mist over the surface, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean river under an overcast cloudy sky, transparent water, natural green banks, no debris, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A shallow clean river with a sandy bottom clearly visible through the water, sunlight sparkling on the surface, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean mountain river with small white rapids, crystal-clear water, pine trees in the background, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A slow-moving clean river passing through farmland in Punjab, clear water, green wheat fields nearby, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of a clean river bank, clear water gently touching clean sand, no trash or foam, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean river in warm evening golden light, clear water, reeds along the edge, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Wide-angle shot of a clean river with clear water reflecting a bright blue sky, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Top-down view of clear river water with smooth stones visible underneath, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",

    # NOT CONTAMINATED - Lake (14-25)
    "A calm clean lake with clear blue water and green mountains in the background, bright daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of a clean lake edge with transparent water and small pebbles visible, soft daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean lake on a cloudy day, still grey-blue clear water, natural shoreline, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean lake with a small wooden jetty, clear calm water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean lake in early morning mist, glassy smooth surface, clear water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean lake surrounded by green hills, clear water, midday sunlight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Shoreline of a clean lake seen from slightly above, shallow transparent water turning deep blue further out, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean lake at sunset with clear calm water reflecting orange sky, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean lake with light ripples from the wind, clear water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean well-maintained lake in a city park, clear water, tidy banks, no litter, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Shallow clean lake water with healthy green aquatic plants visible at the bottom, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean dam reservoir with clear blue water and a concrete edge, sunny day, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",

    # NOT CONTAMINATED - Pond (26-37)
    "A small clean pond with clear water, a few green lily pads, fresh green grass around it, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean village pond in rural Punjab with clear water, trees on the bank, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of a clean pond surface with clear water reflecting the sky, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean garden pond with clear water and stones around the edge, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean pond in early morning with still clear water and soft light, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean pond under a cloudy sky, clear calm water, green surroundings, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean fish pond with clear water and small fish visible below the surface, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean pond with reeds at the edge and transparent water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Top-down view of clear pond water with the muddy bottom faintly visible, no scum, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean pond in bright afternoon sunlight, clear water, grassy banks, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean natural spring-fed pond with very clear water and rocks around it, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Wide shot of a clean pond with clear water next to green farmland, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",

    # NOT CONTAMINATED - Stream/Canal (38-50)
    "A clean irrigation canal in Punjab, Pakistan with clear flowing water and green crop fields on both sides, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean concrete-lined irrigation canal with clear water, sunny day, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean stream flowing over rocks in a forest, clear transparent water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean narrow stream in a hilly area with clear cold water and rocks, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of clear canal water flowing, bottom visible through the water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean small watercourse (khaal) beside green rice paddy fields, clear water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean canal seen from a bridge, clear water, trees on both sides, afternoon, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean stream on a cloudy day, clear water flowing over pebbles, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean stream with a small waterfall in soft morning light, clear water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean irrigation canal next to sugarcane fields, clear flowing water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Clear fresh tube-well water flowing into a small field channel in a farm, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A shallow clean stream with a sandy bed and sunlight on the water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A clean irrigation canal in warm evening light, clear calm water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",

    # CONTAMINATED - River (51-63)
    "A polluted river with dark murky water and floating plastic bottles and plastic bags, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A river with garbage dumped along the banks and brown polluted water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "An industrial pipe discharging dark wastewater into a river, discolored water spreading, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted river covered with thick white chemical foam, murky water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A highly turbid muddy brown river carrying floating debris and branches, cloudy day, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A river with blackish sewage-contaminated water and dirty banks, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of a polluted river surface with an oily film showing rainbow sheen, greyish water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted river with dead fish floating in murky water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted river near a city with grey dirty water and trash on the surface, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A river with reddish-brown discolored water from industrial dye waste, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted river with floating plastic and patches of foam under a cloudy sky, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "View from a bridge of a dark polluted plume mixing into a river, clear contrast of dirty water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted river bank with municipal waste and dark stagnant water at the edge, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",

    # CONTAMINATED - Lake (64-75)
    "A lake covered with a thick bright green algae bloom, murky water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A lake shore covered with plastic waste and dirty water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A lake with brownish highly turbid water and floating debris, cloudy day, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A lake with a visible oil spill, dark oily patches and rainbow sheen on the water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted lake with dead fish and scum near the shore, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A lake with bluish-green toxic-looking algae scum on the surface, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A lake with dirty foam patches collecting near the shore, murky water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "An urban lake with floating litter and grey polluted water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted lake with floating waste under a cloudy grey sky, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A shallow lake with milky cloudy water and visible suspended particles, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of a lake edge with dirty brown froth and trash, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A lake with dark discolored water near an industrial area, factory chimneys in the distance, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",

    # CONTAMINATED - Pond (76-87)
    "A stagnant pond completely covered with green algae scum, murky water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A village pond with garbage on the banks and dark dirty water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A pond receiving sewage from a drain pipe, black polluted water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted pond with plastic bags and bottles floating on the surface, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A pond with muddy brown water and trampled muddy banks, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A pond with an oily film and rainbow sheen on dark water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of a pond surface with thick slimy green scum and floating dirt, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A pond with white detergent foam and bubbles on murky water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A pond next to a crop field with unnaturally bright green water from fertilizer runoff, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A pond with rotting leaves and dark tea-colored murky water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A polluted pond with trash along the banks under a cloudy sky, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A pond with reddish rust-colored water and orange sediment at the edges, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",

    # CONTAMINATED - Stream/Canal (88-100)
    "An irrigation canal in Punjab, Pakistan with muddy brown water and floating trash, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A canal carrying dark grey foamy industrial effluent, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "An urban drain (nullah) with black sewage water and floating garbage, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A canal with plastic bags and waste stuck along the edges, murky water, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A stream with orange iron-stained discolored water and rusty rocks, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A canal covered with white detergent foam, cloudy water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A canal near a factory with unnatural multicolored dye-polluted water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A stream with milky white cloudy water, suspended particles visible, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A field water channel with greenish murky water and an empty pesticide container on the bank, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A canal with dead fish floating in murky polluted water, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "Close-up of canal water with an oily sheen and dark patches, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "A stream with a sewage pipe outfall pouring dirty water into it, daylight, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark",
    "View from a bridge of a canal filled with garbage-laden brown water, daytime, photorealistic, realistic smartphone photo, natural colors, no people, no text, no watermark"
]

os.makedirs("water_dataset/not_contaminated", exist_ok=True)
os.makedirs("water_dataset/contaminated", exist_ok=True)

print("Starting generation with delay...")

# User-Agent header add karein taaki request block na ho
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

for idx, prompt in enumerate(prompts, start=1):
    folder_name = "not_contaminated" if idx <= 50 else "contaminated"
    encoded_prompt = urllib.parse.quote(prompt)
    
    # Simple image URL format
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=768&height=768&seed={idx}&nologo=true"
    
    try:
        response = requests.get(url, headers=headers, timeout=40)
        if response.status_code == 200:
            file_path = f"water_dataset/{folder_name}/image_{idx}.jpg"
            with open(file_path, "wb") as f:
                f.write(response.content)
            print(f"[{idx}/100] Downloaded to {folder_name}/image_{idx}.jpg")
        else:
            print(f"[{idx}/100] Error: Status Code {response.status_code}")
    except Exception as e:
        print(f"[{idx}/100] Failed: {e}")
    
    # 2 seconds ka pause taaki 402 error na aaye
    time.sleep(2)

print("\nDone!")