// technically an embed too, but it uses embeds in it's own embeds so...
// this only gets streamtape and dropload embeds
// movies only provider
import { getMovieMediaDetails } from "~/functions/tmdb";
import { evalResolver } from "../../embeds/evalResolver";
import { streamtapeResolve } from "../../embeds/streamtape";
import 'dotenv/config'

const remote = process.env.disable_same_ip_embeds

const baseurl = "https://filmpertutti.app" //check new domains -> https://filmpertuttiiii.nuovo.live/

export async function scrapeFilmPerTutti(imdbid) {
    const movie_media = await getMovieMediaDetails(imdbid)
    const prefetchurl = `${baseurl}/wp-json/wp/v2/posts?search=${encodeURIComponent(movie_media.title)}&page=1&_fields=link,id`;

    const finalstreams = [];
    
    try {
        // Fetch data from the prefetch URL
        const response = await fetch(prefetchurl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
            }
        });
        
        if (!response.ok) {
            return null; // Return null if the response is not ok
        }
        
        // Parse the JSON response to get the link
        const data = await response.json();
        if (data.length === 0) {
            return null; // Return null if no results are found
        }
        
        // Get the link from the JSON response
        const url = data[0].link + "?show_video=true";

        // Fetch the final page content
        const finalResponse = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
            }
        });
        
        if (!finalResponse.ok) {
            return null;
        }

        // Parse the response text for streaming links
        const text = await finalResponse.text();
        //console.log(text);
        const iframeRegex = /<iframe[^>]+src="([^"]+)"[^>]*>/g;
        
        let iframematch;
        while ((iframematch = iframeRegex.exec(text)) !== null) {
          const embedurl = iframematch[1];  // URL inside the iframe src

          // Check if the iframe URL matches one of the known streaming services
          if (embedurl.includes('safevideo.click')) {
              //console.log(embedurl);
              // Fetch the final page content
              const embedResponse = await fetch(embedurl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
                }
              });
              let text = await embedResponse.text();  
              console.log("FOUND FILMPERTUTTI EMBED", url, text);
          }
      }

      //TODO: should contains mixdrop, streamtape, doodstream, wolfstream, nitroflare
      const droploadregex = /dropload\.io\/([^"]+)/g;
      const supervideoregex = /supervideo\.cc\/([^"]+)/g;
      const streamtaperegex = /https:\/\/streamtape\.com\/([^"]+)/g;


      let match;
      if (remote != "true") {
        
        while ((match = droploadregex.exec(text)) !== null) {
          const embedurl = `${match[0]}`
          const url = await evalResolver(new URL(embedurl))
          console.log(url);
              finalstreams.push({
                  name: "Stremify IT",
                  type: "url",
                  url: url,
                  title: `FILMPERTUTTI - auto (dropload.io)`
              })
        } 
    
        while ((match = streamtaperegex.exec(text)) !== null) {
          //console.log("STREAMTAPE FOUND");
          const initialurl = await streamtapeResolve(match[0])
          const finalurl = initialurl.replace('  .substring(1).substring(2)', "")
          console.log(finalurl);
          finalstreams.push({
              name: "Stremify IT",
              type: "url",
              url: finalurl,
              title: `FILMPERTUTTI - auto (streamtape.com)`
          })
        }
      }

      while ((match = supervideoregex.exec(text)) !== null) {
        const embedurl = `https://${match[0]}`        
        const url = await evalResolver(new URL (embedurl))
        console.log(url);
            finalstreams.push({
                name: "Stremify IT",
                type: "url",
                url: url,
                title: `FILMPERTUTTI - auto (supervideo.cc)`
            })
      }
      return(finalstreams)
  
    } catch (error) {
      return(null)
    }

}