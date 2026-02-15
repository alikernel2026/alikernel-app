import { defineConfig } from 'astro/config';
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: 'server', // 👈 تم التغيير من static إلى server
  adapter: cloudflare() // 👈 إضافة المحول ليعمل على كلاود فلير
});