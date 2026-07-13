/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendOrigin = process.env.ATHENA_BACKEND_URL || 'http://127.0.0.1:8000'

    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/backend-health',
        destination: `${backendOrigin}/health`,
      },
    ]
  },
}

export default nextConfig
