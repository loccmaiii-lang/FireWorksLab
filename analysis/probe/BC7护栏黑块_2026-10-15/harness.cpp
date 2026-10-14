// raw RGBA8 (w*h*4) -> BC7 (bc7enc) -> decoded raw RGBA8
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>
#include "bc7enc.h"
#include "bc7decomp.h"
int main(int argc, char** argv) {
  if (argc < 6) { fprintf(stderr, "in out w h uber [perceptual]\n"); return 1; }
  int w = atoi(argv[3]), h = atoi(argv[4]), uber = atoi(argv[5]); bool perc = argc > 6 && atoi(argv[6]);
  std::vector<unsigned char> img(w * h * 4), out(w * h * 4);
  FILE* f = fopen(argv[1], "rb"); fread(img.data(), 1, img.size(), f); fclose(f);
  bc7enc_compress_block_init();
  bc7enc_compress_block_params p; bc7enc_compress_block_params_init(&p);
  if (!perc) bc7enc_compress_block_params_init_linear_weights(&p);
  p.m_uber_level = uber; p.m_max_partitions = BC7ENC_MAX_PARTITIONS;
  for (int by = 0; by < h; by += 4) for (int bx = 0; bx < w; bx += 4) {
    unsigned char px[64], blk[16]; bc7decomp::color_rgba dec[16];
    for (int y = 0; y < 4; y++) memcpy(px + y * 16, &img[((by + y) * w + bx) * 4], 16);
    bc7enc_compress_block(blk, px, &p);
    bc7decomp::unpack_bc7(blk, dec);
    for (int y = 0; y < 4; y++) memcpy(&out[((by + y) * w + bx) * 4], &dec[y * 4], 16);
  }
  f = fopen(argv[2], "wb"); fwrite(out.data(), 1, out.size(), f); fclose(f);
  return 0;
}
