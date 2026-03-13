import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2 } from "lucide-react";
import { SiX, SiFacebook, SiReddit, SiLinkedin, SiTelegram, SiWhatsapp } from "react-icons/si";
import { Mail } from "lucide-react";

interface SocialShareProps {
  url: string;
  text: string;
  buttonLabel?: string;
  buttonVariant?: "outline" | "default" | "ghost";
  buttonSize?: "sm" | "default" | "lg";
  className?: string;
  "data-testid"?: string;
}

interface SharePlatform {
  name: string;
  icon: any;
  getUrl: (text: string, url: string) => string;
  popup?: boolean;
  popupSize?: { w: number; h: number };
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    name: "X (Twitter)",
    icon: SiX,
    getUrl: (text: string, url: string) =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    popup: true,
    popupSize: { w: 550, h: 420 },
  },
  {
    name: "Facebook",
    icon: SiFacebook,
    getUrl: (_text: string, url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(_text)}`,
    popup: true,
    popupSize: { w: 600, h: 500 },
  },
  {
    name: "Reddit",
    icon: SiReddit,
    getUrl: (text: string, url: string) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
    popup: true,
    popupSize: { w: 600, h: 500 },
  },
  {
    name: "LinkedIn",
    icon: SiLinkedin,
    getUrl: (_text: string, url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    popup: true,
    popupSize: { w: 600, h: 500 },
  },
  {
    name: "Telegram",
    icon: SiTelegram,
    getUrl: (text: string, url: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "WhatsApp",
    icon: SiWhatsapp,
    getUrl: (text: string, url: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + "\n\n" + url)}`,
  },
  {
    name: "Email",
    icon: Mail,
    getUrl: (text: string, url: string) =>
      `mailto:?subject=${encodeURIComponent("Check this out")}&body=${encodeURIComponent(text + "\n\n" + url)}`,
  },
];

function openShareWindow(shareUrl: string, size?: { w: number; h: number }) {
  const w = size?.w || 600;
  const h = size?.h || 500;
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  window.open(
    shareUrl,
    "share_window",
    `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

export function SocialShare({
  url,
  text,
  buttonLabel = "Share",
  buttonVariant = "outline",
  buttonSize = "sm",
  className,
  ...props
}: SocialShareProps) {
  const [open, setOpen] = useState(false);

  const handleClick = (platform: SharePlatform, e: React.MouseEvent) => {
    const shareUrl = platform.getUrl(text, url);
    if (platform.popup) {
      e.preventDefault();
      openShareWindow(shareUrl, platform.popupSize);
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className={className}
          data-testid={props["data-testid"] || "button-social-share"}
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SHARE_PLATFORMS.map((platform) => (
          <DropdownMenuItem
            key={platform.name}
            className="flex items-center gap-2 cursor-pointer"
            data-testid={`share-${platform.name.toLowerCase().replace(/[^a-z]/g, "")}`}
            onClick={(e) => handleClick(platform, e)}
            asChild={!platform.popup}
          >
            {platform.popup ? (
              <div className="flex items-center gap-2">
                <platform.icon className="h-4 w-4" />
                {platform.name}
              </div>
            ) : (
              <a
                href={platform.getUrl(text, url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <platform.icon className="h-4 w-4" />
                {platform.name}
              </a>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
