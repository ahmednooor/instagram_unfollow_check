import json


class TagsEndpointsMixin(object):
    """For endpoints in ``/tags/``."""

    def tag_info(self, tag):
        """
        Get tag info

        :param tag:
        :return:
        """
        endpoint = 'tags/{tag!s}/info/'.format(**{'tag': tag})
        res = self._call_api(endpoint)
        return res

    def tag_related(self, tag, **kwargs):
        """
        Get related tags

        :param tag:
        :return:
        """
        endpoint = 'tags/{tag!s}/related/'.format(**{'tag': tag})
        query = {
            'visited': json.dumps([{'id': tag, 'type': 'hashtag'}], separators=(',', ':')),
            'related_types': json.dumps(['hashtag', 'location'], separators=(',', ':'))}
        res = self._call_api(endpoint, query=query)
        return res

    def tag_search(self, text, **kwargs):
        """
        Search tag

        :param text:
        :param kwargs:
        :return:
        """
        query = {
            'q': text,
            'timezone_offset': self.timezone_offset,
            'count': 30,
        }
        query.update(kwargs)
        res = self._call_api('tags/search/', query=query)
        return res
