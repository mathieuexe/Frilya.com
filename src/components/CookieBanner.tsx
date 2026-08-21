import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function CookieBanner() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'cookie_banner_enabled')
          .single();
          
        if (error && error.code !== 'PGRST116') throw error;
        
        // Default to true if not set
        if (!data) {
          setEnabled(true);
        } else {
          setEnabled(data.value === 'true' || data.value === true);
        }
      } catch (err) {
        console.error('Error fetching cookie banner setting:', err);
        setEnabled(true); // Default fallback
      }
    };
    
    fetchSetting();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const script = document.createElement('script');
    script.src = "//www.termsfeed.com/public/cookie-consent/4.2.0/cookie-consent.js";
    script.charset = "UTF-8";
    script.async = true;
    
    script.onload = () => {
      if ((window as any).cookieconsent) {
        (window as any).cookieconsent.run({
          "notice_banner_type": "simple",
          "consent_type": "express",
          "palette": "light",
          "language": "fr",
          "page_load_consent_levels": ["strictly-necessary"],
          "notice_banner_reject_button_hide": false,
          "preferences_center_close_button_hide": false,
          "page_refresh_confirmation_buttons": false,
          "website_privacy_policy_url": "https://www.frilya.com/confidentialite"
        });
      }
    };
    
    document.head.appendChild(script);

  }, [enabled]);

  return null;
}
