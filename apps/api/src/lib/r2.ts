import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Bindings } from '../index'

export function createR2Client(env: Bindings): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

export async function getPresignedPutUrl(
  env: Bindings,
  fileKey: string,
  mimeType: string,
  fileSize: number,
): Promise<string> {
  const client = createR2Client(env)

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: mimeType,
    ContentLength: fileSize,
  })

  return getSignedUrl(client, command, { expiresIn: 3600 })
}
