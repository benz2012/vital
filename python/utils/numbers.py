def find_closest(choices, search_num):
    return choices[
        min(
            range(len(choices)),
            key = lambda i: abs(choices[i] - search_num)
        )
    ]

''' Find the bucket that this resolution fits into
    Ensure this method matches the client-side implementation determineBucketForResolution
'''
def determine_bucket_for_resolution(compression_buckets, megapixels):
    for bucket_key in compression_buckets:
        bucket = compression_buckets[bucket_key]
        image_larger_than_bucket_min = megapixels >= bucket['bottomThreshold']
        bucket_above = bucket['bucketAbove']
        if not bucket_above:
            if image_larger_than_bucket_min:
                return bucket_key
        else:
            if image_larger_than_bucket_min and megapixels < compression_buckets[bucket_above]['bottomThreshold']:
                return bucket_key
