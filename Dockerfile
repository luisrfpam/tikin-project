FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time variables consumed by Vite (must be set in Dokploy)
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG TIKIN_ADMIN_EMAIL
ARG TIKIN_ADMIN_PASSWORD

ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV TIKIN_ADMIN_EMAIL=$TIKIN_ADMIN_EMAIL
ENV TIKIN_ADMIN_PASSWORD=$TIKIN_ADMIN_PASSWORD

# If admin credentials are provided as TIKIN_* in Dokploy, map them to
# VITE_* aliases so they can be read by frontend code when needed.
ENV VITE_TIKIN_ADMIN_EMAIL=$TIKIN_ADMIN_EMAIL
ENV VITE_TIKIN_ADMIN_PASSWORD=$TIKIN_ADMIN_PASSWORD

# Fail fast if required frontend variables are missing during image build.
RUN test -n "$VITE_SUPABASE_PROJECT_ID" || (echo "Missing VITE_SUPABASE_PROJECT_ID" && exit 1)
RUN test -n "$VITE_SUPABASE_URL" || (echo "Missing VITE_SUPABASE_URL" && exit 1)
RUN test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" || (echo "Missing VITE_SUPABASE_PUBLISHABLE_KEY" && exit 1)

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
