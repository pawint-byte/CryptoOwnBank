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

const SHARE_PLATFORMS = [
  {
    name: "X (Twitter)",
    icon: SiX,
    getUrl: (text: string, url: string) =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(text + "\n\n")}${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    icon: SiFacebook,
    getUrl: (_text: string, url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "Reddit",
    icon: SiReddit,
    getUrl: (text: string, url: string) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    name: "LinkedIn",
    icon: SiLinkedin,
    getUrl: (text: string, url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
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
          <DropdownMenuItem key={platform.name} asChild>
            <a
              href={platform.getUrl(text, url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 cursor-pointer"
              data-testid={`share-${platform.name.toLowerCase().replace(/[^a-z]/g, "")}`}
            >
              <platform.icon className="h-4 w-4" />
              {platform.name}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
